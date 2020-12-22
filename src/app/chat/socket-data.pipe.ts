import { Injectable, PipeTransform } from '@nestjs/common';

type Data = object | object[];
@Injectable()
export class SocketDataPipe implements PipeTransform<Data> {
  public transform(data: Data) {
    let transformed: Data;
    if (Array.isArray(data)) {
      transformed = data[0];
    } else {
      transformed = data;
    }
    return transformed;
  }
}
