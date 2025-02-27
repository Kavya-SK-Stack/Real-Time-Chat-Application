
const corsOptions = 
    {
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.CLIENT_URL,
    ],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}
  
const OURCHAT_TOKEN = "ourchat-token";

export  {corsOptions,OURCHAT_TOKEN};