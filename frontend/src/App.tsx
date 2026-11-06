import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingPage } from './modules/booking/pages/BookingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BookingPage />
    </QueryClientProvider>
  );
}

export default App;
