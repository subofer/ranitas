"use client"

const FormContainer = ({
  title,
  children,
  className = "",
  variant = "default",
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "card":
        return "bg-white border border-slate-200 rounded-lg shadow-lg p-6";
      case "section":
        return "bg-slate-50 border border-slate-100 rounded-md shadow-sm p-4";
      case "minimal":
        return "bg-transparent p-2";
      default:
        return "bg-white border border-slate-200 rounded-lg shadow-md p-5";
    }
  };

  return (
    <div
      className={`
        ${getVariantStyles()}
        ${className}
      `}
      {...props}
    >
      {title && (
        <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-200/60">
          {title}
        </h3>
      )}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
};

export default FormContainer;
