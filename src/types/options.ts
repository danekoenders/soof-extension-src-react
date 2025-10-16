export interface OptionItem {
  type: "message" | "function";
  label?: string;
  message?: string;
  function?: string;
  requiredTool?: string;
  variant?: "ai" | "primary" | "secondary";
}

export interface OptionsData {
  type: "template" | "custom";
  template?: string;
  parameters?: Record<string, any>;
  custom?: {
    optionsLayout?: "default" | "horizontal-scroll" | "vertical";
    label?: string;
    description?: string;
    options?: OptionItem[];
  };
}

// Utility function to replace placeholders with parameters
export function applyParameters(
  text: string,
  parameters?: Record<string, any>
): string {
  if (!parameters || !text) return text;

  let result = text;
  Object.keys(parameters).forEach((key) => {
    const value = parameters[key];
    // Replace {key} and {{key}} patterns
    result = result.replace(
      new RegExp(`\\{\\{?${key}\\}?\\}`, "g"),
      String(value)
    );
  });

  return result;
}

// Template definitions
export const OPTIONS_TEMPLATES: Record<
  string,
  {
    label?: string;
    description?: string;
    optionsLayout?: "default" | "horizontal-scroll" | "vertical";
    options: OptionItem[];
  }
> = {
  fetch_order_data_tool: {
    label: "Tracking opsturen per e-mail?",
    description:
      "Wil je een tracking e-mail krijgen met de status van je bestelling?",
    optionsLayout: "default",
    options: [
      {
        type: "message",
        label: "Ja",
        message: "Stuur tracking e-mail voor order {orderNumber}",
        requiredTool: "send_order_tracking_email",
        variant: "primary",
      },
      {
        type: "message",
        label: "Nee",
        variant: "secondary",
      },
    ],
  },
};
