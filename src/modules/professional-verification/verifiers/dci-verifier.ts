import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { IVerifier, VerificationResult } from './verifier.interface';
import { STATE_COUNCIL_MAP } from '../constants/state-councils';

@Injectable()
export class DciVerifier implements IVerifier {
  private readonly logger = new Logger(DciVerifier.name);
  readonly source = 'dci_idr';
  private readonly DCI_URL = 'https://dciindia.gov.in/DentistDetails.aspx';
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  }

  async verify(registrationId: string, stateCouncil: string): Promise<VerificationResult> {
    try {
      this.logger.log(`Verifying dentist: regNo=${registrationId}, council=${stateCouncil}`);

      const councilCode = STATE_COUNCIL_MAP[stateCouncil] || stateCouncil;

      const getRes = await this.client.get(this.DCI_URL);
      const cookies = getRes.headers['set-cookie'];

      const $ = cheerio.load(getRes.data);
      const viewstate = $('#__VIEWSTATE').val() as string;
      const eventValidation = $('#__EVENTVALIDATION').val() as string;
      const viewstateGenerator = $('#__VIEWSTATEGENERATOR').val() as string;

      if (!viewstate || !eventValidation) {
        return {
          verified: false,
          error: 'Failed to extract form tokens from DCI website',
          retryable: true,
          source: this.source,
        };
      }

      const postBody = new URLSearchParams({
        __VIEWSTATE: viewstate,
        __EVENTVALIDATION: eventValidation,
        __VIEWSTATEGENERATOR: viewstateGenerator || '',
        __EVENTTARGET: '',
        __EVENTARGUMENT: '',
        'ctl00$MainContent$txtRegNo': registrationId,
        'ctl00$MainContent$ddlSDC': councilCode,
        'ctl00$MainContent$btnSearch': 'Search',
      });

      const cookieHeader = cookies ? cookies.join('; ') : '';

      const postRes = await this.client.post(this.DCI_URL, postBody.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieHeader,
          Referer: this.DCI_URL,
        },
      });

      const $$ = cheerio.load(postRes.data);
      const grid = $$('#MainContent_GVSmall');

      if (!grid.length) {
        const countText = $$('#MainContent_lblCount').text();
        if (countText.includes(':0')) {
          return {
            verified: false,
            error: 'Registration number not found in DCI database',
            retryable: false,
            source: this.source,
          };
        }

        return {
          verified: false,
          error: 'Unable to connect to Dental Council database. Please try again later.',
          retryable: true,
          source: this.source,
        };
      }

      const headerCells: string[] = [];
      $$('tr', grid).first().find('th, td').each((_, el) => {
        headerCells.push($$(el).text().trim().toLowerCase());
      });

      const colIndex: Record<string, number> = {};
      headerCells.forEach((text, i) => {
        if (text.includes('name')) colIndex.name = i;
        else if (
          text.includes('registration') ||
          text.includes('reg.') ||
          text.includes('reg no')
        )
          colIndex.regNo = i;
        else if (text.includes('council')) colIndex.council = i;
        else if (text.includes('qualification')) colIndex.qualification = i;
        else if (text.includes('date')) colIndex.date = i;
      });

      const nameIdx = colIndex.name ?? 1;
      const regNoIdx = colIndex.regNo ?? 2;
      const councilIdx = colIndex.council;
      const qualificationIdx = colIndex.qualification;
      const dateIdx = colIndex.date;

      let matched = false;
      let matchedName = '';
      let matchedRegNo = '';
      let matchedCouncil = '';
      let matchedQualification = '';
      let matchedDate = '';

      $$('tr', grid).each((i, row) => {
        if (i === 0) return;
        const cells = $$(row).find('td');
        const regNo = $$(cells[regNoIdx]).text().trim();

        if (regNo.toUpperCase() === registrationId.toUpperCase()) {
          matched = true;
          matchedName = $$(cells[nameIdx]).text().trim().replace(/^Dr\.\s*/i, '');
          matchedRegNo = regNo;
          if (councilIdx !== undefined)
            matchedCouncil = $$(cells[councilIdx]).text().trim();
          if (qualificationIdx !== undefined)
            matchedQualification = $$(cells[qualificationIdx]).text().trim();
          if (dateIdx !== undefined) matchedDate = $$(cells[dateIdx]).text().trim();
        }
      });

      if (matched) {
        this.logger.log(`Dentist verified successfully: ${matchedName} (${matchedRegNo})`);
        return {
          verified: true,
          matchedName,
          matchedRegNo,
          matchedCouncil: matchedCouncil || undefined,
          matchedQualification: matchedQualification || undefined,
          matchedRegistrationDate: matchedDate || undefined,
          source: this.source,
        };
      }

      return {
        verified: false,
        error: 'Registration number not found in DCI database',
        retryable: false,
        source: this.source,
      };
    } catch (error) {
      this.logger.error(`DCI verification failed: ${(error as Error).message}`);
      return {
        verified: false,
        error: 'Unable to connect to Dental Council database. Please try again later.',
        retryable: true,
        source: this.source,
      };
    }
  }
}
