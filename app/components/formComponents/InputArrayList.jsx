"use client"

const Pill = ({ value, onRemove }) => (
  <div className="justify-between bg-blue-200 rounded-full px-2 py-1">
    <span>{value.nombre}</span>
    <button type="button" onClick={() => onRemove(value.id)} className="ml-2 text-slate-600 hover:text-slate-800">
      &times;
    </button>
  </div>
);

const InputArrayList = ({ name, placeholder, label, value, onChange, onRemove, ...props }) => {
  return (
  <div className="relative">
    <div
      name={"aver"}
      className="
        flex
        flex-row
        form-input
        w-full
        min-h-[52px]
        max-h-[52px]
        border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0
        focus:border-slate-400 peer
      "
    >
      <label
        htmlFor="aver"
        className={`
            absolute left-0 transition-all px-2.5
            text-sm font-medium top-0.5 text-black
            peer-placeholder-shown:text-md peer-placeholder-shown:top-2.5 peer-focus:text-sm peer-focus:top-0.5`}
      >
        {label}
      </label>

      <div className="
        flex flex-row justify-end align-middle flex-wrap ml-20 gap-2
        h-full
        w-full
        ">
        {value.map((item, index) => (
          <Pill key={index} value={item} onRemove={onRemove} />
        ))}
      </div>

    </div>
  </div>
  );
};

export default InputArrayList;
