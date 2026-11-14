"""
alu.py - Arithmetic Logic Unit (ALU) Implementation for NEXUS
Milestone: Arithmetic Logic Unit (ALU) v0.1

This module provides the ALU class, simulating the core arithmetic and bitwise
computation engine of a CPU.
"""


class ALU:
    """
    Simulates the Arithmetic Logic Unit (ALU) of a CPU.

    The ALU is responsible for performing all fundamental arithmetic calculations
    (such as addition, subtraction, multiplication, and integer division) and
    bitwise logical evaluations (such as AND, OR, XOR, and NOT).
    """

    # Supported binary operations (require two operands)
    BINARY_OPERATIONS = {"ADD", "SUB", "MUL", "DIV", "AND", "OR", "XOR"}

    # Supported unary operations (require exactly one operand)
    UNARY_OPERATIONS = {"NOT"}

    def execute(self, opcode: str, operand1: int, operand2: int = None) -> int:
        """
        Execute an arithmetic or logical operation.

        Args:
            opcode (str): The operation code (e.g., 'ADD', 'SUB', 'MUL', 'DIV',
                          'AND', 'OR', 'XOR', 'NOT').
            operand1 (int): The first integer operand.
            operand2 (int, optional): The second integer operand for binary operations.
                                      Must be None for unary operations (NOT).

        Returns:
            int: The integer result of the calculation.

        Raises:
            TypeError: If opcode is not a string, or any operand is not an integer
                       (including rejecting boolean types).
            ValueError: If the opcode is unsupported, if a binary operation is missing
                        operand2, or if a unary operation receives an unexpected operand2.
            ZeroDivisionError: If operand2 is zero during integer division (DIV).
        """
        # Validate opcode type
        if not isinstance(opcode, str):
            raise TypeError(f"Opcode must be a string, got {type(opcode).__name__}.")

        normalized_opcode = opcode.strip().upper()

        # Validate that the opcode is supported by the ALU
        all_supported = self.BINARY_OPERATIONS | self.UNARY_OPERATIONS
        if normalized_opcode not in all_supported:
            raise ValueError(
                f"Unsupported ALU operation '{normalized_opcode}'. "
                f"Supported operations are: {', '.join(sorted(all_supported))}."
            )

        # Validate operand1
        self._validate_integer_operand(operand1, "First operand")

        # Handle UNARY operations (e.g. NOT)
        if normalized_opcode in self.UNARY_OPERATIONS:
            if operand2 is not None:
                raise ValueError(
                    f"Operation '{normalized_opcode}' requires exactly one operand, "
                    f"but received unexpected second operand: {operand2}."
                )
            return self._execute_unary(normalized_opcode, operand1)

        # Handle BINARY operations (e.g. ADD, SUB, MUL, DIV, AND, OR, XOR)
        if operand2 is None:
            raise ValueError(
                f"Operation '{normalized_opcode}' requires two operands, but operand2 was not provided."
            )

        # Validate operand2
        self._validate_integer_operand(operand2, "Second operand")

        return self._execute_binary(normalized_opcode, operand1, operand2)

    def _execute_binary(self, opcode: str, a: int, b: int) -> int:
        """
        Execute a 2-operand binary operation.

        Note on DIV:
        Uses Python's floor division operator (//), which returns an integer.
        For example: 7 // 2 = 3.
        """
        if opcode == "ADD":
            return a + b
        elif opcode == "SUB":
            return a - b
        elif opcode == "MUL":
            return a * b
        elif opcode == "DIV":
            if b == 0:
                raise ZeroDivisionError("Division by zero in ALU DIV operation.")
            return a // b
        elif opcode == "AND":
            return a & b
        elif opcode == "OR":
            return a | b
        elif opcode == "XOR":
            return a ^ b
        else:
            raise ValueError(f"Unknown binary operation '{opcode}'.")

    def _execute_unary(self, opcode: str, a: int) -> int:
        """
        Execute a 1-operand unary operation.
        """
        if opcode == "NOT":
            return ~a
        else:
            raise ValueError(f"Unknown unary operation '{opcode}'.")

    @staticmethod
    def _validate_integer_operand(operand, label: str):
        """
        Ensure an operand is an integer and strictly reject booleans
        (since bool is a subclass of int in Python).
        """
        if isinstance(operand, bool) or not isinstance(operand, int):
            raise TypeError(
                f"{label} must be an integer, got {type(operand).__name__}."
            )
