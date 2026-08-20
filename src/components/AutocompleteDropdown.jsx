import { useState, useRef, useEffect } from 'react';
import './AutocompleteDropdown.css';
export default function AutocompleteDropdown({ options, value, onChange, placeholder }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync internal search term when external value prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset search term to the actual selected value if they didn't pick anything
        setSearchTerm(value || '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    setSearchTerm(opt);
    onChange(opt);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="autocomplete-wrapper">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="autocomplete-input"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {filteredOptions.map((opt, idx) => (
            <li 
              key={idx}
              onMouseDown={() => handleSelect(opt)} // Use onMouseDown to fire before input onBlur
              className="autocomplete-li"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
