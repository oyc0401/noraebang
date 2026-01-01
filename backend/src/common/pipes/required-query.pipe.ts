import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";

@Injectable()
export class RequiredQueryPipe implements PipeTransform {
  constructor(private readonly paramName: string) {}

  transform(value: any): any {
    if (!value || (typeof value === "string" && !value.trim())) {
      throw new BadRequestException(`${this.paramName} is required`);
    }
    return value;
  }
}
