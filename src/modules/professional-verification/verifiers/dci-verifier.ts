import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { IVerifier, VerificationResult } from './verifier.interface';
import { STATE_COUNCIL_MAP } from '../constants/state-councils';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
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

  private async captureDebugInfo(page: puppeteer.Page, consoleErrors: string[]): Promise<VerificationResult['debug']> {
    const debug: VerificationResult['debug'] = {};
    try {
      debug.pageUrl = page.url();
      debug.pageTitle = await page.title();
      debug.pageText = (await page.evaluate(() => document.body?.innerText?.substring(0, 5000))) || '';
      debug.pageHtml = (await page.evaluate(() => document.body?.innerHTML?.substring(0, 10000))) || '';
      debug.consoleErrors = consoleErrors;
      const screenshotPath = path.join(os.tmpdir(), `dci-verifier-failure-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const buf = fs.readFileSync(screenshotPath);
      if (buf.length <= 300000) {
        debug.screenshot = buf.toString('base64');
      }
    } catch {}
    return debug;
  }

  async verify(registrationId: string, stateCouncil: string): Promise<VerificationResult> {
    const page = await (await this.getBrowser()).newPage();
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`Page Error: ${(err as Error).message}`);
    });

    try {
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(60000);

      this.logger.log(`Verifying dentist: regNo=${registrationId}, council=${stateCouncil}`);

      await page.goto('https://dciindia.gov.in/DentistDetails.aspx', {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      await page.waitForSelector('#MainContent_txtRegNo', { timeout: 30000 });
      await page.waitForSelector('#MainContent_ddlSDC', { timeout: 30000 });
      await page.waitForSelector('#MainContent_btnSearch', { timeout: 30000 });

      const councilCode = STATE_COUNCIL_MAP[stateCouncil] || stateCouncil;

      await page.evaluate((regNo) => {
        const el = document.getElementById('MainContent_txtRegNo') as HTMLInputElement;
        if (el) el.value = regNo;
      }, registrationId);

      await page.select('#MainContent_ddlSDC', councilCode);

      const navigationPromise = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      await page.click('#MainContent_btnSearch');

      await navigationPromise;

      await page.waitForSelector('#MainContent_grdIDS', { timeout: 30000 });

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
      const debug = await this.captureDebugInfo(page, consoleErrors);

      this.logger.error(
        `DCI verification failed: ${(error as Error).stack || (error as Error).message}`,
      );

      return {
        verified: false,
        error: 'Unable to connect to Dental Council database. Please try again later.',
        retryable: true,
        source: this.source,
        debug,
      };
    } finally {
      if (!page.isClosed()) {
        await page.close();
      }
    }
  }

  async onApplicationShutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
