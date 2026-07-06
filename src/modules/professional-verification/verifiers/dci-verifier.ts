import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { IVerifier, VerificationResult } from './verifier.interface';
import { STATE_COUNCIL_MAP } from '../constants/state-councils';
import { exec } from 'child_process';
import { promisify } from 'util';

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
    const page = await (await this.getBrowser()).newPage();
    try {
      await page.setDefaultNavigationTimeout(30000);
      await page.setDefaultTimeout(20000);

      this.logger.log(`Verifying dentist: regNo=${registrationId}, council=${stateCouncil}`);

      await page.goto('https://dciindia.gov.in/DentistDetails.aspx', {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.waitForSelector('select[name$="ddlSDC"]', { timeout: 15000 });
      await page.type('input[name$="txtRegNo"]', registrationId);
      await page.select('select[name$="ddlSDC"]', STATE_COUNCIL_MAP[stateCouncil] || stateCouncil);

      await page.click('input[name$="btnSearch"]');

      await page.waitForSelector('#MainContent_grdIDS tr', { timeout: 20000 });

      const hasResults = await page.$('#MainContent_grdIDS tr');
      if (!hasResults) {
        return { verified: false, error: 'Registration number not found in DCI database', retryable: false, source: this.source };
      }

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
      } catch {}
      this.logger.error(`DCI verification failed: ${(error as Error).stack || (error as Error).message} | ${pageState}`);
      return {
        verified: false,
        error: `Unable to connect to Dental Council database. Please try again later.`,
        retryable: true,
        source: this.source,
      };
    } finally {
      await page.close();
    }
  }

  async onApplicationShutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
