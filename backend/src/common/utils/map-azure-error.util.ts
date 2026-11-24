import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import {
  AzureQuotaExceededError,
  AzureSttRequestError,
  AzureTtsRequestError,
} from '../../modules/azure-speech/azure-speech.service';

export function mapAzureError(err: unknown): HttpException {
  if (err instanceof AzureQuotaExceededError) {
    return new ForbiddenException('Monthly speech assessment quota reached. It resets on the 1st of next month.');
  }

  if (err instanceof AzureTtsRequestError || err instanceof AzureSttRequestError) {
    if (err.status === 429) {
      return new HttpException('Azure Speech service is rate-limited. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (err.status === 401 || err.status === 403) {
      return new HttpException('Speech service is misconfigured. Please contact support.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  return new HttpException('Speech service temporarily unavailable. Please try again.', HttpStatus.SERVICE_UNAVAILABLE);
}