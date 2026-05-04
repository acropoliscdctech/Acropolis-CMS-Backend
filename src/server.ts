import app from "./app";

// server port
const PORT = process.env.PORT || 8080;

// database connection
import { connectDb } from "./config/database";

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server started on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
