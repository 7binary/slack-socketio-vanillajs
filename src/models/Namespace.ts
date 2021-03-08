import { Room } from './Room';

export class Namespace {
  public rooms: Room[] = [];

  constructor(
    public id: number,
    public title: string,
    public img: string,
    public path: string) {};

  addRoom(room: Room) {
    this.rooms.push(room);
  }

  getRooms() {
    return this.rooms.map(room => room.toArray());
  }

  findRoomByName(name: string) {
    return this.rooms.find(room => `${room.id}` === name);
  }

  toArray() {
    return {
      img: this.img,
      path: this.path,
    };
  }
}
