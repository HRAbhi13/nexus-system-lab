"""
execution_engine.py - CPU Instruction Execution Engine for NEXUS
Milestone: CPU Instruction Execution Engine v0.1

This module provides the CPU class, which coordinates the RegisterFile,
ProgramCounter, Instruction, and ALU to execute programs.
"""

from app.cpu.registers import RegisterFile
from app.cpu.program_counter import ProgramCounter
from app.cpu.instruction import Instruction
from app.cpu.alu import ALU


class CPU:
    """
    Simulates a central processing unit (CPU).

    The CPU integrates:
    - RegisterFile: 4 general-purpose registers (R1, R2, R3, R4).
    - ProgramCounter: Tracks memory address of the next instruction.
    - ALU: Executes arithmetic and logical operations.
    - Program Storage: Stores loaded Instruction objects.
    - Halted Status: Tracks whether the CPU has stopped running.
    """

    # Binary arithmetic and logical opcodes supported by the CPU
    BINARY_ALU_OPS = {"ADD", "SUB", "MUL", "DIV", "AND", "OR", "XOR"}

    def __init__(self):
        """
        Initialize the CPU with its sub-components and default state.
        """
        self.registers = RegisterFile()
        self.pc = ProgramCounter()
        self.alu = ALU()
        self.instructions = []
        self.halted = False

    def load_program(self, instructions):
        """
        Load a list of Instruction objects into the CPU.

        Resets all registers and the Program Counter to 0, and clears the halted state.

        Args:
            instructions (list or tuple): A sequence of Instruction instances.

        Raises:
            TypeError: If instructions is not a list/tuple or contains non-Instruction items.
        """
        if not isinstance(instructions, (list, tuple)):
            raise TypeError(
                f"Program must be a list or tuple of Instruction objects, got {type(instructions).__name__}."
            )

        for i, item in enumerate(instructions):
            if not isinstance(item, Instruction):
                raise TypeError(
                    f"All program items must be Instruction instances. Item at index {i} is {type(item).__name__}."
                )

        self.instructions = list(instructions)
        self.registers.reset()
        self.pc.reset()
        self.halted = False

    def step(self):
        """
        Execute exactly one instruction at the current Program Counter address.

        Advances the Program Counter by 1 after executing any non-HALT instruction.

        Raises:
            RuntimeError: If called while the CPU is halted.
            IndexError: If the Program Counter points outside the loaded program.
            ValueError: If an opcode or operand is invalid.
            TypeError: If operand types are incorrect.
            ZeroDivisionError: If a DIV instruction attempts division by zero.
        """
        # 1. Check if the CPU is already halted
        if self.halted:
            raise RuntimeError("Cannot execute step: CPU is halted.")

        # 2. Check if PC points to a valid instruction in the program
        current_address = self.pc.get()
        if current_address >= len(self.instructions):
            raise IndexError(
                f"Program Counter address {current_address} is out of program bounds (total instructions: {len(self.instructions)})."
            )

        # 3. Fetch current instruction
        instruction = self.instructions[current_address]

        # 4. Execute instruction and advance PC
        return self.execute_instruction(instruction)

    def execute_instruction(self, instruction):
        """
        Execute a single Instruction object: decode opcode, execute operation,
        and advance Program Counter (unless HALT).

        Args:
            instruction (Instruction): The instruction to execute.

        Returns:
            str: A readable summary of the executed instruction.
        """
        if self.halted:
            raise RuntimeError("Cannot execute instruction: CPU is halted.")

        opcode = instruction.opcode
        operands = instruction.operands

        if opcode == "LOAD":
            self._execute_load(operands)
            result = f"LOAD {operands[0]}, {operands[1]}"
        elif opcode in self.BINARY_ALU_OPS:
            self._execute_binary_alu(opcode, operands)
            result = f"{opcode} {operands[0]}, {operands[1]}, {operands[2]}"
        elif opcode == "NOT":
            self._execute_not(operands)
            result = f"NOT {operands[0]}, {operands[1]}"
        elif opcode == "HALT":
            if len(operands) != 0:
                raise ValueError(f"HALT instruction takes no operands, got {len(operands)}.")
            self.halted = True
            return "HALT"
        else:
            raise ValueError(f"Unsupported instruction opcode: '{opcode}'.")

        # Advance Program Counter for non-HALT instructions
        self.pc.increment()
        return result

    def _execute_load(self, operands):
        """
        Execute LOAD destination_register, immediate_value
        """
        if len(operands) != 2:
            raise ValueError(
                f"LOAD instruction requires 2 operands (destination, value), got {len(operands)}."
            )

        dest, value = operands

        if not isinstance(dest, str):
            raise TypeError(f"Destination register must be a string, got {type(dest).__name__}.")

        if isinstance(value, bool) or not isinstance(value, int):
            raise TypeError(f"LOAD immediate value must be an integer, got {type(value).__name__}.")

        self.registers.write(dest, value)

    def _execute_binary_alu(self, opcode: str, operands):
        """
        Execute binary ALU instruction: dest_reg, src_reg1, src_reg2
        """
        if len(operands) != 3:
            raise ValueError(
                f"{opcode} instruction requires 3 operands (destination, source1, source2), got {len(operands)}."
            )

        dest, src1, src2 = operands

        if not isinstance(dest, str):
            raise TypeError(f"Destination register must be a string, got {type(dest).__name__}.")
        if not isinstance(src1, str):
            raise TypeError(f"Source register 1 must be a string, got {type(src1).__name__}.")
        if not isinstance(src2, str):
            raise TypeError(f"Source register 2 must be a string, got {type(src2).__name__}.")

        val1 = self.registers.read(src1)
        val2 = self.registers.read(src2)
        result = self.alu.execute(opcode, val1, val2)
        self.registers.write(dest, result)

    def _execute_not(self, operands):
        """
        Execute NOT destination_register, source_register
        """
        if len(operands) != 2:
            raise ValueError(
                f"NOT instruction requires 2 operands (destination, source), got {len(operands)}."
            )

        dest, src = operands

        if not isinstance(dest, str):
            raise TypeError(f"Destination register must be a string, got {type(dest).__name__}.")
        if not isinstance(src, str):
            raise TypeError(f"Source register must be a string, got {type(src).__name__}.")

        val = self.registers.read(src)
        result = self.alu.execute("NOT", val)
        self.registers.write(dest, result)

    def run(self) -> dict:
        """
        Execute instructions sequentially until HALT is encountered or program ends.

        Returns:
            dict: The final CPU state containing registers, pc, and halted status.
        """
        while not self.halted:
            if self.pc.get() >= len(self.instructions):
                self.halted = True
                break
            self.step()

        return self.get_state()

    def get_state(self) -> dict:
        """
        Return the current state of the CPU.
        """
        return {
            "registers": self.registers.registers.copy(),
            "pc": self.pc.get(),
            "halted": self.halted,
        }
