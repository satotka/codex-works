import {SAVE_KEY} from './storage.js';
export class PlaySession {
  constructor(storage){this.storage=storage;this.blocked=false;try{this.expected=storage.getItem(SAVE_KEY);}catch{}}
  check(){
    if(this.blocked)return false;
    try{if(this.storage.getItem(SAVE_KEY)!==this.expected){this.blocked=true;return false;}}catch{}
    return true;
  }
  saved(){try{this.expected=this.storage.getItem(SAVE_KEY);}catch{}}
}
