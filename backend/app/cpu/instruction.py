"""
instruction.py - CPU Instruction Representation for NEXUS
Milestone: Instruction Representation System v0.1

This module provides the Instruction class, modeling a single CPU instruction
with an operation code (opcode) and associated operands.
"""


class Instruction:
    """
    Represents a single CPU instruction.

    An instruction consists of:
    - opcode: The operation to perform (e.g., 'LOAD', 'ADD', 'HALT').
    - operands: The inputs or targets of the operation, such as register names
                ('R1') or immediate integer values (10).
    """

    def __init__(self, opcode: str, operands=None):
        """
        Initialize an Instruction instance.

        Args:
            opcode (str): The operation code (e.g., 'LOAD', 'ADD', 'HALT').
            operands (list or tuple, optional): The operands for this instruction.
                                                Defaults to None (treated as empty).

        Raises:
            TypeError: If opcode is not a string, or operands is not a list or tuple.
            ValueError: If opcode is empty or only whitespace.
        """
        # Validate that the opcode is a string
        if not isinstance(opcode, str):
            raise TypeError(f"Opcode must be a string, got {type(opcode).__name__}.")

        # Clean the opcode: remove surrounding whitespace and convert to uppercase
        cleaned_opcode = opcode.strip().upper()

        # Opcode cannot be empty
        if not cleaned_opcode:
            raise ValueError("Opcode cannot be empty or contain only whitespace.")

        self.opcode = cleaned_opcode

        # Handle default operands when none are provided
        if operands is None:
            operands = []

        # Validate that operands container is a list or tuple
        if not isinstance(operands, (list, tuple)):
            raise TypeError(
                f"Operands must be provided in a list or tuple, got {type(operands).__name__}."
            )

        # Validate each operand in the container
        validated_operands = []
        for operand in operands:
            # Reject booleans (in Python, bool is a subclass of int) and non-str/int types
            if isinstance(operand, bool) or not isinstance(operand, (str, int)):
                raise TypeError(
                    f"Operand must be a string or integer, got {type(operand).__name__}."
                )

            # Strip whitespace from string operands (like register names)
            if isinstance(operand, str):
                cleaned_operand = operand.strip()
                if not cleaned_operand:
                    raise ValueError("String operands cannot be empty.")
                validated_operands.append(cleaned_operand)
            else:
                validated_operands.append(operand)

        # Store operands in an immutable tuple to prevent accidental modification
        self.operands = tuple(validated_operands)

    def __str__(self) -> str:
        """
        Return a human-readable assembly-style string representation of the instruction.

        Examples:
            'LOAD R1, 10'
            'ADD R3, R1, R2'
            'HALT'
        """
        if not self.operands:
            return self.opcode

        operands_str = ", ".join(str(op) for op in self.operands)
        return f"{self.opcode} {operands_str}"

    def __repr__(self) -> str:
        """
        Return an unambiguous string representation for debugging.
        """
        return f"Instruction('{self.opcode}', {list(self.operands)})"

    def __eq__(self, other) -> bool:
        """
        Check equality between two Instruction instances.
        """
        if not isinstance(other, Instruction):
            return False
        return self.opcode == other.opcode and self.operands == other.operands
