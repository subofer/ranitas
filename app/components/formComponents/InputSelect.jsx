"use client"
import { useState, useEffect } from "react";
import Input from "./Input";
import Select from "./Select";
import Icon from "./Icon";

const InputSelect = ({
  mode = "input", // "input" o "select"
  options = [],
  valueField = "value",
  textField = "text",
  allowToggle = true,
  toggleIcon = "chevron-down",
  onModeChange,
  ...props
}) => {
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const handleModeToggle = () => {
    const newMode = currentMode === "input" ? "select" : "input";
    setCurrentMode(newMode);
    onModeChange?.(newMode);
  };

  const enhancedProps = {
    ...props,
    actionIcon: allowToggle ? (
      <Icon
        icono={toggleIcon}
        className="text-gray-500 hover:text-gray-700 cursor-pointer"
        onClick={handleModeToggle}
      />
    ) : props.actionIcon
  };

  if (currentMode === "select") {
    return (
      <Select
        {...enhancedProps}
        options={options}
        valueField={valueField}
        textField={textField}
      />
    );
  }

  return <Input {...enhancedProps} />;
};

export default InputSelect;
