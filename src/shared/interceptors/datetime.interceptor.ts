import { ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DateTimeInterceptor implements NestInterceptor {
  // tslint:disable-next-line:variable-name
  public intercept(_context: ExecutionContext, call$: Observable<any>) {
    const removeMs = str => str.replace(/.000Z/, '');
    function formatDate(element) {
      if (!element) {
        element = [];
        return;
      }
      if (element.createdAt && element.createdAt.constructor === Date) {
        element.createdAt = removeMs(element.createdAt.toISOString());
      }
      if (element.updatedAt && element.updatedAt.constructor === Date) {
        element.updatedAt = removeMs(element.updatedAt.toISOString());
      }
    }
    return call$.pipe(
      map(data => {
        // check data is array, but in fast way
        if (data && data.constructor === Array) {
          // tslint tells me to use for..of, but i don't need any perf hit
          // tslint:disable-next-line:prefer-for-of
          for (let i = 0; i < data.length; i++) {
            const element = data[i];
            formatDate(element);
          }
        } else {
          // it's a normal object
          formatDate(data);
        }
        return data;
      }),
    );
  }
}
