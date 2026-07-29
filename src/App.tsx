import { WalletProvider } from "./wallet/provider";
import { Header } from "./components/Header";
import { Poll } from "./components/Poll";

export function App() {
  return (
    <WalletProvider>
      <Header />
      <Poll />
    </WalletProvider>
  );
}
