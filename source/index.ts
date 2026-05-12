import { gql } from "./gql/tagged";

type TestData = { hello: string };
type TestVars = { name: string };

const TEST_QUERY = gql<TestData, TestVars>`
  query Test($name: String!) {
    hello
  }
`;

console.log(TEST_QUERY.loc?.source.body);


/* const userId = "42";
const query = gql`query { user(id: ${userId}) { name } }`; */