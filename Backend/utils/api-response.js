export default class apiresponse {
  constructor(statusCode, data, message = "sucess") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.sucess = statusCode < 400;
  }
}
