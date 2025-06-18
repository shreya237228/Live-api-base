import "../styles/globals.css";
import { ToolRegistryProvider } from "../ai-tools/ask-ai";

export default function App({ Component, pageProps }) {
  return (
    <ToolRegistryProvider>
      <Component {...pageProps} />
    </ToolRegistryProvider>
  );
}
