export function calcAge(dateOfBirth: string): number {
    const today = new Date();
    const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);

    let age = today.getFullYear() - birthYear;

    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdayHasNotPassed =
        currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay);

    if (birthdayHasNotPassed) {
        age--;
    }

    return age;
}
