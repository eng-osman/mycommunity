/*
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, InsertEvent } from 'typeorm';
@EventSubscriber()
export class PostSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>) {
    // console.log(`BEFORE ENTITY INSERTED: `, event.entity);
  }
  beforeUpdate(event: UpdateEvent<any>) {
    event.entity.updatedAt = new Date().getUTCDate();
  }
}
*/
