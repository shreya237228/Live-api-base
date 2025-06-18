import React, { createContext, useContext, useState, useCallback } from "react";

// Simple tool registry context - kept minimal for compatibility
const ToolRegistryContext = createContext();

export const ToolRegistryProvider = ({ children }) => {
  const [tools, setTools] = useState([]);
  const [toolMappings, setToolMappings] = useState({});

  const registerTool = useCallback((name, definition, implementation) => {
    // Simplified - just store for compatibility but don't actually use
    console.log(
      `Tool registration attempted for ${name} - skipped in vanilla mode`
    );
    return () => {}; // Return cleanup function
  }, []);

  const clearAllTools = useCallback(() => {
    setTools([]);
    setToolMappings({});
  }, []);

  const getRegisteredTools = useCallback(() => {
    return []; // Always return empty array in vanilla mode
  }, []);

  const getRegisteredToolMappings = useCallback(() => {
    return {}; // Always return empty object in vanilla mode
  }, []);

  return (
    <ToolRegistryContext.Provider
      value={{
        registerTool,
        clearAllTools,
        getRegisteredTools,
        getRegisteredToolMappings,
      }}
    >
      {children}
    </ToolRegistryContext.Provider>
  );
};

export const useToolRegistry = () => {
  const context = useContext(ToolRegistryContext);
  if (!context) {
    throw new Error(
      "useToolRegistry must be used within a ToolRegistryProvider"
    );
  }
  return context;
};

// Example tool function (you can modify this for your assignment)
export const exampleTool = async ({ message }) => {
  try {
    // Example tool logic - replace with your assignment logic
    return `Echo: ${message}`;
  } catch (error) {
    console.error("[ExampleTool] Error:", error);
    return { error: `Failed to process message: ${error.message}` };
  }
};
