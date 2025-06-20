import React, { createContext, useContext, useState, useCallback } from "react";

// Tool registry context
const ToolRegistryContext = createContext();

export const ToolRegistryProvider = ({ children }) => {
  const [tools, setTools] = useState([]); // Array of { name, definition, implementation }
  const [toolMappings, setToolMappings] = useState({}); // name -> implementation

  // Register a tool
  const registerTool = useCallback((name, definition, implementation) => {
    setTools((prev) => [...prev, { name, definition }]);
    setToolMappings((prev) => ({ ...prev, [name]: implementation }));
    // Return cleanup function
    return () => {
      setTools((prev) => prev.filter((tool) => tool.name !== name));
      setToolMappings((prev) => {
        const newMappings = { ...prev };
        delete newMappings[name];
        return newMappings;
      });
    };
  }, []);

  // Clear all tools
  const clearAllTools = useCallback(() => {
    setTools([]);
    setToolMappings({});
  }, []);

  // Get all registered tool definitions
  const getRegisteredTools = useCallback(() => {
    return tools;
  }, [tools]);

  // Get all tool implementations (mapping)
  const getRegisteredToolMappings = useCallback(() => {
    return toolMappings;
  }, [toolMappings]);

  // Call a tool by name
  const callTool = useCallback(
    async (name, params) => {
      const impl = toolMappings[name];
      if (!impl) throw new Error(`Tool '${name}' not found`);
      return await impl(params);
    },
    [toolMappings]
  );

  return (
    <ToolRegistryContext.Provider
      value={{
        registerTool,
        clearAllTools,
        getRegisteredTools,
        getRegisteredToolMappings,
        callTool,
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

// --- Assignment Tools ---

// Current Time Tool
export const currentTimeTool = async () => {
  try {
    const now = new Date();
    return now.toLocaleString();
  } catch (error) {
    return { error: `Failed to get current time: ${error.message}` };
  }
};

// Register tools on mount
export const ToolRegistryAutoRegister = () => {
  const { registerTool } = useToolRegistry();
  React.useEffect(() => {
    // Register Current Time Tool
    const unregister = registerTool(
      "currentTime",
      {
        name: "currentTime",
        description: "Returns the current date and time as a string.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      currentTimeTool
    );
    return () => {
      unregister();
    };
  }, [registerTool]);
  return null;
};
