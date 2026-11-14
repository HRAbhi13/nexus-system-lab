"""
registers.py - CPU Register File Implementation for NEXUS
Milestone: CPU Register System v0.1

This module provides the RegisterFile class, which simulates
a set of general-purpose CPU registers.
"""


class RegisterFile:
    """
    Simulates the register storage unit of a CPU.

    In computer architecture, a register file is an array of processor registers.
    Registers are the fastest storage locations in a computer system, residing
    directly inside the CPU core to hold immediate values for computation.

    This class models 4 general-purpose registers: R1, R2, R3, and R4.
    """

    def __init__(self):
        """
        Initialize the RegisterFile.

        All four registers (R1, R2, R3, R4) are created and initialized to 0.
        A standard Python dictionary is used as the underlying storage.
        """
        # Store register names as keys and their current values as values
        self.registers = {
            "R1": 0,
            "R2": 0,
            "R3": 0,
            "R4": 0,
        }

    def write(self, register: str, value: int):
        """
        Write a value to a specified register.

        Args:
            register (str): The name of the register (e.g., 'R1', 'R2', 'R3', 'R4').
            value (int): The numeric value to store.

        Raises:
            ValueError: If the register name is not found in self.registers.
        """
        # Validate that the register name exists in our register dictionary
        if register not in self.registers:
            raise ValueError(
                f"Invalid register '{register}'. Valid registers are: {list(self.registers.keys())}"
            )

        # Store the value into the register
        self.registers[register] = value

    def read(self, register: str) -> int:
        """
        Read and return the value stored in a specified register.

        Args:
            register (str): The name of the register to read.

        Returns:
            int: The integer value currently stored in the register.

        Raises:
            ValueError: If the register name is not found in self.registers.
        """
        # Validate that the register name exists in our register dictionary
        if register not in self.registers:
            raise ValueError(
                f"Invalid register '{register}'. Valid registers are: {list(self.registers.keys())}"
            )

        # Return the value from the dictionary
        return self.registers[register]

    def reset(self):
        """
        Reset all registers back to their default value of 0.
        """
        # Iterate over each register key and set its value to 0
        for register in self.registers:
            self.registers[register] = 0

    def display(self):
        """
        Display the current values of all registers to the console.
        """
        # Print each register and its current value
        for register, value in self.registers.items():
            print(f"{register} = {value}")
