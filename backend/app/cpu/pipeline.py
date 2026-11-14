"""
pipeline.py - Fetch-Decode-Execute Pipeline for NEXUS
Milestone: Fetch-Decode-Execute Pipeline v0.1

This module provides the FetchDecodeExecutePipeline class, modeling the classic
three-stage instruction execution cycle of a central processing unit.
"""

from app.cpu.execution_engine import CPU
from app.cpu.instruction import Instruction


class FetchDecodeExecutePipeline:
    """
    Simulates the Fetch-Decode-Execute cycle of a CPU.

    The instruction cycle consists of three fundamental stages:
    1. FETCH: Retrieve the instruction from program memory at the address
              pointed to by the Program Counter (PC).
    2. DECODE: Parse and validate the instruction's opcode and operands to
               understand the intended operation and verify syntax/constraints.
    3. EXECUTE: Carry out the requested operation using the CPU's registers and ALU,
                update CPU state, and advance the Program Counter.
    """

    def __init__(self, cpu: CPU = None):
        """
        Initialize the Fetch-Decode-Execute pipeline.

        Args:
            cpu (CPU, optional): An existing CPU instance to coordinate.
                                 If None, a fresh CPU instance is created.
        """
        self.cpu = cpu if cpu is not None else CPU()
        self.cycle_count = 0
        self.execution_history = []
        self.current_stage = "IDLE"
        self.current_address = None
        self.current_instruction = None

    def load_program(self, instructions):
        """
        Load a program into the underlying CPU and reset pipeline metrics.

        Args:
            instructions (list or tuple): A sequence of Instruction instances.
        """
        self.cpu.load_program(instructions)
        self.cycle_count = 0
        self.execution_history = []
        self.current_stage = "IDLE"
        self.current_address = None
        self.current_instruction = None

    def fetch(self) -> Instruction:
        """
        FETCH STAGE:
        Retrieve the instruction pointed to by the CPU's Program Counter.

        Returns:
            Instruction: The fetched instruction instance.

        Raises:
            RuntimeError: If the CPU is already halted.
            IndexError: If the Program Counter points outside the loaded program.
        """
        if self.cpu.halted:
            raise RuntimeError("Cannot fetch instruction: CPU is halted.")

        address = self.cpu.pc.get()
        if address >= len(self.cpu.instructions):
            raise IndexError(
                f"Program Counter address {address} is out of program bounds (program length: {len(self.cpu.instructions)})."
            )

        self.current_stage = "FETCH"
        self.current_address = address
        self.current_instruction = self.cpu.instructions[address]
        return self.current_instruction

    def decode(self, instruction: Instruction = None) -> dict:
        """
        DECODE STAGE:
        Inspect, validate, and break down an instruction into structured data.

        Args:
            instruction (Instruction, optional): The instruction to decode.
                If omitted, decodes the most recently fetched instruction.

        Returns:
            dict: Structured decoding information containing:
                  - 'instruction': The Instruction instance
                  - 'opcode': The validated uppercase opcode string
                  - 'operands': The tuple of operands
                  - 'type': Classification ('IMMEDIATE', 'BINARY_ALU', 'UNARY_ALU', 'CONTROL')

        Raises:
            TypeError: If instruction is not an Instruction object, or operand types are invalid.
            ValueError: If opcode is unrecognized, operand counts are invalid, or register names are unknown.
        """
        self.current_stage = "DECODE"

        # If instruction is not explicitly passed, use the last fetched instruction
        if instruction is None:
            if self.current_instruction is None:
                instruction = self.fetch()
            else:
                instruction = self.current_instruction

        if not isinstance(instruction, Instruction):
            raise TypeError(
                f"Decode requires an Instruction instance, got {type(instruction).__name__}."
            )

        opcode = instruction.opcode
        operands = instruction.operands

        # Known valid opcodes
        valid_opcodes = {"LOAD", "HALT", "NOT"} | self.cpu.BINARY_ALU_OPS
        if opcode not in valid_opcodes:
            raise ValueError(f"Unknown or unsupported opcode: '{opcode}'.")

        # Validate instruction structure and register names against CPU register set
        valid_registers = set(self.cpu.registers.registers.keys())

        if opcode == "LOAD":
            if len(operands) != 2:
                raise ValueError(
                    f"LOAD instruction requires 2 operands (destination, value), got {len(operands)}."
                )
            dest, value = operands
            if not isinstance(dest, str):
                raise TypeError(f"Destination register must be a string, got {type(dest).__name__}.")
            if dest not in valid_registers:
                raise ValueError(f"Invalid register name '{dest}'. Valid: {list(valid_registers)}")
            if isinstance(value, bool) or not isinstance(value, int):
                raise TypeError(f"LOAD immediate value must be an integer, got {type(value).__name__}.")
            category = "IMMEDIATE"

        elif opcode in self.cpu.BINARY_ALU_OPS:
            if len(operands) != 3:
                raise ValueError(
                    f"{opcode} instruction requires 3 operands (destination, source1, source2), got {len(operands)}."
                )
            dest, src1, src2 = operands
            for label, reg in [("Destination", dest), ("Source 1", src1), ("Source 2", src2)]:
                if not isinstance(reg, str):
                    raise TypeError(f"{label} register must be a string, got {type(reg).__name__}.")
                if reg not in valid_registers:
                    raise ValueError(f"Invalid register name '{reg}'. Valid: {list(valid_registers)}")
            category = "BINARY_ALU"

        elif opcode == "NOT":
            if len(operands) != 2:
                raise ValueError(
                    f"NOT instruction requires 2 operands (destination, source), got {len(operands)}."
                )
            dest, src = operands
            for label, reg in [("Destination", dest), ("Source", src)]:
                if not isinstance(reg, str):
                    raise TypeError(f"{label} register must be a string, got {type(reg).__name__}.")
                if reg not in valid_registers:
                    raise ValueError(f"Invalid register name '{reg}'. Valid: {list(valid_registers)}")
            category = "UNARY_ALU"

        elif opcode == "HALT":
            if len(operands) != 0:
                raise ValueError(f"HALT instruction takes no operands, got {len(operands)}.")
            category = "CONTROL"

        return {
            "instruction": instruction,
            "opcode": opcode,
            "operands": operands,
            "type": category,
        }

    def execute(self, decoded_info) -> str:
        """
        EXECUTE STAGE:
        Carry out the decoded instruction using the existing CPU execution engine.

        Args:
            decoded_info (dict or Instruction): Decoded information from decode(),
                                                 or an Instruction instance.

        Returns:
            str: A descriptive result of the executed operation.

        Raises:
            RuntimeError: If called while CPU is halted.
            ZeroDivisionError: If a DIV instruction attempts division by zero.
        """
        if self.cpu.halted:
            raise RuntimeError("Cannot execute instruction: CPU is halted.")

        self.current_stage = "EXECUTE"

        # Extract Instruction instance
        if isinstance(decoded_info, Instruction):
            instruction = decoded_info
        elif isinstance(decoded_info, dict):
            instruction = decoded_info.get("instruction")
            if instruction is None:
                instruction = Instruction(decoded_info["opcode"], list(decoded_info["operands"]))
        else:
            raise TypeError(f"Invalid decoded instruction format: {type(decoded_info).__name__}.")

        # Execute using CPU execution engine
        return self.cpu.execute_instruction(instruction)

    def execute_cycle(self) -> dict:
        """
        Perform a full Fetch-Decode-Execute cycle for one instruction.

        Returns:
            dict: Structured cycle report containing all required telemetry:
                  cycle, cycle_number, address, instruction_address,
                  instruction, original_instruction, opcode, operands,
                  stage, current_stage, result, execution_result,
                  halted, cpu_halted_status.
        """
        if self.cpu.halted:
            raise RuntimeError("Cannot execute cycle: CPU is halted.")

        address = self.cpu.pc.get()

        # 1. FETCH
        instruction = self.fetch()

        # 2. DECODE
        decoded = self.decode(instruction)

        # 3. EXECUTE
        exec_result = self.execute(decoded)

        # Record cycle completion
        self.cycle_count += 1
        cycle_entry = {
            "cycle": self.cycle_count,
            "cycle_number": self.cycle_count,
            "address": address,
            "instruction_address": address,
            "instruction": instruction,
            "original_instruction": instruction,
            "opcode": decoded["opcode"],
            "operands": decoded["operands"],
            "stage": "EXECUTE",
            "current_stage": "EXECUTE",
            "result": exec_result,
            "execution_result": exec_result,
            "halted": self.cpu.halted,
            "cpu_halted_status": self.cpu.halted,
        }

        self.execution_history.append(cycle_entry)
        return dict(cycle_entry)

    def run(self) -> list:
        """
        Execute instruction cycles continuously until HALT is encountered
        or the program runs out of instructions.

        Returns:
            list: The recorded execution history.
        """
        while not self.cpu.halted and self.cpu.pc.get() < len(self.cpu.instructions):
            self.execute_cycle()

        return self.get_execution_history()

    def get_execution_history(self) -> list:
        """
        Return a copy of the execution history to prevent external mutation.

        Returns:
            list: List of dictionary entries recording each completed cycle.
        """
        return [dict(entry) for entry in self.execution_history]
