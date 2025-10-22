import app from "./src/app";

// server port
const PORT = process.env.PORT || 3000;

// database connection
import { connectDb } from "./src/config/database";

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server started on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
