import { startServer } from "./main";

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
