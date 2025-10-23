import jsonwebtoken from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const generateToken = (userId: string,role : string) => {
  const token = jsonwebtoken.sign({ id: userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
  return token;
};

export default generateToken;
