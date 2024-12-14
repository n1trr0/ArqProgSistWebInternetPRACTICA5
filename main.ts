import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "npm:@apollo/server/standalone";
import { MongoClient } from "mongodb";
import { courseModel, studentModel, teacherModel } from "./types.ts";
import { schema } from "./schema.ts";
import { resolvers } from "./resolvers.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  throw new Error("Mongo URL not found");
}

const Client = new MongoClient(MONGO_URL);
await Client.connect();
console.info("Client connected");

const DB = Client.db("Practica5");
const StudentsCollection = DB.collection<studentModel>("student");
const TeachersCollection = DB.collection<teacherModel>("teacher");
const CoursesCollection = DB.collection<courseModel>("course");

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: async () => (await {
    StudentsCollection,
    TeachersCollection,
    CoursesCollection
  }),
  listen: { port: 8080 },
});

console.info(`Server ready at ${url}`);
