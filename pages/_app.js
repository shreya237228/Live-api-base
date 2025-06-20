import "../styles/globals.css";
import { ToolRegistryProvider, ToolRegistryAutoRegister } from "../ai-tools/ask-ai";

export default function App({ Component, pageProps }) {
  return (
    <ToolRegistryProvider>
      <ToolRegistryAutoRegister />
      <Component {...pageProps} />
    </ToolRegistryProvider>
  );
}
