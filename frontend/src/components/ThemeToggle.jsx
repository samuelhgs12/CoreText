import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme } from "../utils/theme";
import Icon from "./Icon";

function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleToggle() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={handleToggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          <Icon name={isDark ? "moon" : "sun"} size={16} />
        </span>
      </span>
    </button>
  );
}

export default ThemeToggle;
