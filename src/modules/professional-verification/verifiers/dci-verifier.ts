import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { IVerifier, VerificationResult } from './verifier.interface';
import { STATE_COUNCIL_MAP } from '../constants/state-councils';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const asyncExec = promisify(exec);

@Injectable()
export class DciVerifier implements IVerifier {
  private readonly logger = new Logger(DciVerifier.name);
  readonly source = 'dci_idr';
  private browser: puppeteer.Browser | null = null;

  constructor() {}

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-extensions',
    ];
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: launchArgs,
      });
    } catch (error) {
      this.logger.warn(`Chrome launch failed: ${(error as Error).message}. Installing Chrome...`);
      await asyncExec('npx puppeteer browsers install chrome', { timeout: 120000 });
      this.browser = await puppeteer.launch({
        headless: true,
        args: launchArgs,
      });
    }
    return this.browser;
  }

  async verify(registrationId: string, stateCouncil: string): Promise<VerificationResult> {
    const MAX_RETRIES = 1;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const page = await (await this.getBrowser()).newPage();
      try {
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);

        this.logger.log(`Verifying dentist: regNo=${registrationId}, council=${stateCouncil} (attempt ${attempt + 1})`);

        await page.goto('https://dciindia.gov.in/DentistDetails.aspx', {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        await page.waitForSelector('select[name$="ddlSDC"]', { timeout: 30000 });
        await page.type('input[name$="txtRegNo"]', registrationId);
        await page.select('select[name$="ddlSDC"]', STATE_COUNCIL_MAP[stateCouncil] || stateCouncil);

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
          page.click('input[name$="btnSearch"]'),
        ]);

        await page.waitForSelector('#MainContent_grdIDS tr', { timeout: 30000 });

        const result = await page.evaluate((expectedRegNo: string) => {
          const rows = document.querySelectorAll('#MainContent_grdIDS tr');
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length >= 3) {
              const name = cells[1]?.textContent?.trim().replace(/^Dr\.\s*/i, '');
              const regNo = cells[2]?.textContent?.trim();
              if (regNo?.toUpperCase() === expectedRegNo.toUpperCase()) {
                return { matched: true, name, regNo };
              }
            }
          }
          return { matched: false };
        }, registrationId);

        if (result.matched) {
          this.logger.log(`Dentist verified successfully: ${result.name} (${result.regNo})`);
          return {
            verified: true,
            matchedName: result.name,
            matchedRegNo: result.regNo,
            source: this.source,
          };
        }

        return { verified: false, error: 'Registration number not found in DCI database', retryable: false, source: this.source };
      } catch (error) {
        let pageState = '';
        try {
          pageState = `URL=${page.url()}, Title=${await page.title()}`;
          const screenshotDir = os.tmpdir();
          const screenshotPath = path.join(screenshotDir, `dci-verifier-failure-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          pageState += `, Screenshot=${screenshotPath}`;
        } catch {}
        this.logger.error(`DCI verification failed (attempt ${attempt + 1}): ${(error as Error).stack || (error as Error).message} | ${pageState}`);

        if (attempt < MAX_RETRIES) {
          this.logger.log(`Retrying DCI verification for ${registrationId}...`);
          await page.close();
          continue;
        }

        return {
          verified: false,
          error: `Unable to connect to Dental Council database. Please try again later.`,
          retryable: true,
          source: this.source,
        };
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    }
    return { verified: false, error: 'Unable to connect to Dental Council database. Please try again later.', retryable: true, source: this.source };
  }

  async onApplicationShutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
