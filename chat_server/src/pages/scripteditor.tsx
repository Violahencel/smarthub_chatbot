import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useRouter } from 'next/router';

export default function ScriptEditor() {
    const router = useRouter();
    const { scriptname } = router.query;
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        const fetchScriptContent = async () => {
            if (!scriptname) return;
            
            try {
                const response = await fetch(`/api/v2/prompts/scripts?scriptname=${scriptname}`);
                if (!response.ok) throw new Error('Failed to fetch script content');
                const data = await response.json();
                setContent(data.content);
            } catch (error) {
                console.error('Error fetching script content:', error);
            }
        };

        fetchScriptContent();
    }, [scriptname]);

    return (
        <div className="h-screen flex flex-col bg-[#1e1e1e]">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#252526]">
                <h1 className="text-sm font-medium text-gray-300">{scriptname}</h1>
                <button
                    className="px-3 py-1.5 text-sm text-gray-300 bg-[#0e639c] rounded hover:bg-[#1177bb] focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={true}
                >
                    Save
                </button>
            </div>
            <div className="flex-1">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={content}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        renderWhitespace: 'selection',
                        tabSize: 4,
                        suggestOnTriggerCharacters: false,
                        quickSuggestions: false,
                        parameterHints: { enabled: false },
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        folding: true,
                        renderLineHighlight: 'all',
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                        }
                    }}
                />
            </div>
        </div>
    );
} 