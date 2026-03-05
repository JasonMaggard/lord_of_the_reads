import { registerEnumType } from '@nestjs/graphql';
import { Format } from '@prisma/client';

registerEnumType(Format, {
  name: 'Format',
});

export { Format };
