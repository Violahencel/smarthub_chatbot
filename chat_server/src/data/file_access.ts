import * as fs from 'fs';
import * as path from 'path';

export class FileAccessManager {
    public readFile(filePath: string): string {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
            throw new Error(`Error reading file ${filePath}: ${error.message}`);
        }
    }

    public writeFile(filePath: string, content: string): void {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (error: any) {
            throw new Error(`Error writing to file ${filePath}: ${error.message}`);
        }
    }

    public fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    public getFilenames(directoryPath: string): string[] {
        try {
            if (!fs.existsSync(directoryPath)) {
                throw new Error(`Directory not found: ${directoryPath}`);
            }
            
            const stats = fs.statSync(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${directoryPath}`);
            }

            return fs.readdirSync(directoryPath);
        } catch (error: any) {
            throw new Error(`Error reading directory ${directoryPath}: ${error.message}`);
        }
    }
}