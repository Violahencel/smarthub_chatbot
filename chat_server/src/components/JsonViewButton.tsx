import React, { useState } from 'react';
import JsonViewModal from './JsonViewModal';

interface JsonViewButtonProps {
  jsonData: any;
  id: string;
}

const JsonViewButton: React.FC<JsonViewButtonProps> = ({ jsonData, id }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button 
        onClick={openModal}
        className="inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="View JSON data"
      >
        <svg 
          className="w-4 h-4 mr-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
          />
        </svg>
        View JSON
      </button>

      <JsonViewModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        jsonData={jsonData}
        title={`JSON Data (ID: ${id})`}
      />
    </>
  );
};

export default JsonViewButton; 