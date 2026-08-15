import { useState, useRef, useEffect } from 'react';

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
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{
          fontSize: '1.5rem',
          width: '100%',
          padding: '0.5rem',
          background: 'transparent',
          color: 'inherit',
          border: '1px solid var(--border-color)',
          outline: 'none'
        }}
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'var(--bg-section)',
          border: '1px solid var(--border-color)',
          borderTop: 'none',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          zIndex: 200,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {filteredOptions.map((opt, idx) => (
            <li 
              key={idx}
              onMouseDown={() => handleSelect(opt)} // Use onMouseDown to fire before input onBlur
              style={{
                padding: '0.75rem 1rem',
                fontSize: '1.25rem',
                cursor: 'pointer',
                borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
