class apierror extends Error{
    constructor(statusCode,
        message="some",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode=statusCode
        this.message=message;
        this.success=false;
        this.errors=errors;
        //if stack available
        if(stack){
            this.stack=stack;
        }else{
            Error.captureStackTrace(this,this.constructor)
        }

    }
}
export default apierror;
//ts is a copy paste-able template no need to learn ts 