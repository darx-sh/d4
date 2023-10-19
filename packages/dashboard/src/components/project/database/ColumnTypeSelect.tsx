import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { FieldType, FieldTypeList } from "~/utils/types";
import className from "classnames";

interface ColumnTypeSelectProps {
  disabled: boolean;
  fieldType: FieldType;
  onSelect: (d: FieldType) => void;
}

export default function ColumnTypeSelect(props: ColumnTypeSelectProps) {
  const [selected, setSelected] = useState(props.fieldType);

  return (
    <Listbox
      value={selected}
      onChange={(t: string) => {
        const field = t as FieldType;
        setSelected(field);
        props.onSelect(field);
      }}
      disabled={props.disabled}
    >
      {({ open }) => (
        <>
          <div className="relative rounded-md border shadow-md">
            <div className="flex divide-x divide-indigo-700">
              <div className="flex-1 gap-x-1.5 px-3 py-1.5">
                <p className="text-sm text-gray-400">{selected}</p>
              </div>
              {props.disabled ? null : (
                <Listbox.Button className="w-8 bg-gray-400 p-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-50">
                  <ChevronDownIcon
                    className="h-3 w-3 text-white"
                    aria-hidden="true"
                  />
                </Listbox.Button>
              )}
            </div>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute left-0 z-10 mt-2 w-48 origin-top-right divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {FieldTypeList.map((dxFieldType) => (
                  <Listbox.Option
                    key={dxFieldType}
                    className={({ active }) =>
                      className(
                        active ? "bg-gray-400 text-white" : "text-gray-900",
                        "cursor-default select-none p-4 text-sm"
                      )
                    }
                    value={dxFieldType}
                  >
                    {({ selected, active }) => (
                      <div className="flex flex-col">
                        <div className="flex justify-between">
                          <p
                            className={
                              selected ? "font-semibold" : "font-normal"
                            }
                          >
                            {dxFieldType}
                          </p>
                          {selected ? (
                            <span
                              className={
                                active ? "text-white" : "text-indigo-600"
                              }
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  );
}
