
const corsOptions = 
    {
    origin:   process.env.CLIENT_URL,
    
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}
  
const OURCHAT_TOKEN = "ourchat-token";

export  {corsOptions,OURCHAT_TOKEN};