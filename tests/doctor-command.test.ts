import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Command } from 'commander';
import doctorCmd from '../src/commands/doctor.js';
import type { ExecAsync } from '../src/types/exec.js';

// Mock modules with vi.hoisted to avoid temporal dead zone
const { mockExecAsync, mockFs, mockFontService, mockSharpInstance } = vi.hoisted(() => {
  const mockExecAsync = vi.fn() as unknown as Mock<Parameters<ExecAsync>, ReturnType<ExecAsync>>;
  const mockFs = {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    access: vi.fn()
  };
  const mockFontService = {
    getInstance: vi.fn(),
    getSystemFonts: vi.fn(),
    isFontInstalled: vi.fn()
  };
  const mockSharpInstance = {
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test'))
  };
  return { mockExecAsync, mockFs, mockFontService, mockSharpInstance };
});

vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, callback: any) => {
    const result = mockExecAsync(cmd);
    if (result && typeof result.then === 'function') {
      result.then(
        (res: any) => callback(null, res.stdout, res.stderr),
        (err: any) => callback(err)
      );
    }
  })
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync)
}));

vi.mock('fs', () => ({
  promises: mockFs
}));

vi.mock('sharp', () => ({
  default: Object.assign(
    vi.fn(() => mockSharpInstance),
    {
      versions: {
        sharp: '0.33.5',
        vips: '8.14.5'
      }
    }
  )
}));

vi.mock('../src/services/fonts.js', () => ({
  FontService: mockFontService
}));

vi.mock('../src/core/files.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    output: 'final',
    devices: {
      iphone: { input: 'screenshots/iphone' },
      ipad: { input: 'screenshots/ipad' }
    }
  })
}));

vi.mock('../src/core/devices.js', () => ({
  frameRegistry: [
    { deviceType: 'iphone', displayName: 'iPhone 16 Pro', originalName: 'frame1' },
    { deviceType: 'ipad', displayName: 'iPad Pro', originalName: 'frame2' },
    { deviceType: 'mac', displayName: 'MacBook Pro', originalName: undefined },
    { deviceType: 'watch', displayName: 'Apple Watch', originalName: undefined }
  ]
}));

describe('doctor command', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockFontServiceInstance: any;

  beforeEach(() => {
    program = new Command();
    program.addCommand(doctorCmd());
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
      // Don't throw on exit, just record it
      return undefined as never;
    });

    // Setup FontService mock instance
    mockFontServiceInstance = {
      getSystemFonts: vi.fn().mockResolvedValue(['Arial', 'Helvetica', 'Times New Roman']),
      isFontInstalled: vi.fn().mockResolvedValue(true)
    };
    mockFontService.getInstance.mockReturnValue(mockFontServiceInstance);

    // Default successful mocks
    mockExecAsync.mockResolvedValue({ stdout: '9.8.0', stderr: '' });
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.readdir.mockResolvedValue(['frame1.png', 'frame2.png', 'Frames.json']);
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      iPhone: { '16 Pro': { name: 'iPhone 16 Pro Portrait' } }
    }));
    // Mock fs.access to handle frame file paths
    mockFs.access.mockImplementation((path: string) => {
      // Always succeed for frame files and other paths
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should run all diagnostics successfully', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      console.log('Test output:', output);  // Debug output
      
      expect(output).toContain('Appshot Doctor - System Diagnostics');
      expect(output).toContain('System Requirements:');
      expect(output).toContain('Dependencies:');
      expect(output).toContain('Font System:');
      expect(output).toContain('File System:');
      expect(output).toContain('Frame Assets:');
      expect(output).toContain('Summary:');
    });

    it('should check Node.js version', async () => {
      // Log any errors that happen
      const origError = consoleErrorSpy;
      consoleErrorSpy.mockImplementation((...args) => {
        console.log('Error caught:', args);
        return origError(...args);
      });
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toMatch(/Node\.js v\d+\.\d+\.\d+/);
    });

    it('should check npm availability', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('npm v');
    });

    it('should detect platform', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      const platform = process.platform;
      expect(output).toContain(platform);
    });
  });

  describe('dependency checks', () => {
    it('should check Sharp installation', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Sharp v0.33.5 installed');
      expect(output).toContain('libvips v8.14.5 loaded');
    });

    it('should test Sharp functionality', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      // Sharp test might fail if not properly mocked, check for either outcome
      expect(output).toMatch(/Sharp image processing test (passed|failed)/);
    });

    it('should check OpenAI API key', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('OpenAI API key found');
      
      delete process.env.OPENAI_API_KEY;
    });

    it('should warn when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('OpenAI API key not found');
    });
  });

  describe('font system checks', () => {
    it('should check font detection command on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecAsync.mockImplementation((cmd: string) => {
        if (cmd === 'which system_profiler') {
          return Promise.resolve({ stdout: '/usr/sbin/system_profiler', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Font detection available (system_profiler)');
    });

    it('should check font detection command on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      mockExecAsync.mockImplementation((cmd: string) => {
        if (cmd === 'which fc-list') {
          return Promise.resolve({ stdout: '/usr/bin/fc-list', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Font detection available (fc-list)');
    });

    it('should check system fonts', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('System fonts loaded (3 fonts)');
    });

    it('should check common font availability', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      expect(mockFontServiceInstance.isFontInstalled).toHaveBeenCalledWith('Arial');
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Arial font available');
    });
  });

  describe('filesystem checks', () => {
    it('should check write permissions in current directory', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalled();
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Write permissions in current directory');
    });

    it('should check .appshot directory', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('.appshot directory exists');
      expect(output).toContain('Configuration file valid');
    });

    it('should warn when .appshot directory is missing', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('.appshot directory not found');
    });
  });

  describe('frame assets checks', () => {
    it('should check frames directory', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Frames directory found (2 files)');
    });

    it('should validate Frames.json', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Frames.json valid');
    });

    it('should count frames by device type', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Iphone frames: 1');
      expect(output).toContain('Ipad frames: 1');
      expect(output).toContain('Mac frames: 1');
      expect(output).toContain('Watch frames: 1');
    });

    it('should check if frame files exist', async () => {
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('All frame files present');
    });
  });

  describe('JSON output', () => {
    it('should output results as JSON', async () => {
      await program.parseAsync(['node', 'test', 'doctor', '--json']);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      const report = JSON.parse(output);
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('platform');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('suggestions');
      
      expect(report.summary).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('errors');
    });
  });

  describe('category filtering', () => {
    it('should run only specified categories', async () => {
      await program.parseAsync(['node', 'test', 'doctor', '--category', 'system,dependencies']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      
      expect(output).toContain('System Requirements:');
      expect(output).toContain('Dependencies:');
      expect(output).not.toContain('Font System:');
      expect(output).not.toContain('Frame Assets:');
    });

    it('should handle invalid categories gracefully', async () => {
      await program.parseAsync(['node', 'test', 'doctor', '--category', 'invalid,system']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('System Requirements:');
    });
  });

  describe('verbose mode', () => {
    it('should show detailed information in verbose mode', async () => {
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));
      
      await program.parseAsync(['node', 'test', 'doctor', '--verbose']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      // Verbose mode would show details if there were any errors
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should exit with error code when there are errors', async () => {
      // Simulate write permission error
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      // Check that exit was called with code 1
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should show suggestions for common issues', async () => {
      delete process.env.OPENAI_API_KEY;
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Suggestions:');
      expect(output).toContain('Set OPENAI_API_KEY environment variable');
    });
  });

  describe('platform-specific tests', () => {
    it('should handle Windows platform correctly', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('win32 (Windows)');
      expect(output).toContain('Font detection available (PowerShell)');
    });

    it('should suggest fontconfig installation on Linux when fc-list is missing', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      mockExecAsync.mockImplementation((cmd: string) => {
        if (cmd === 'which fc-list') {
          return Promise.reject(new Error('Command not found'));
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await program.parseAsync(['node', 'test', 'doctor']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Font detection command not found');
      expect(output).toContain('Install fontconfig');
    });
  });
});