// HOC that exposes Apollo client via a prop
import withApollo from 'next-with-apollo';

// package put out by Apollo with 
import ApolloClient from 'apollo-boost';

// http://localhost:4444
import { endpoint } from '../config';


// takes in headers, returns new Apollo client
function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : endpoint,

    // on every request, include credentials ("logged-in" cookies)
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },
  });
}

export default withApollo(createClient);
