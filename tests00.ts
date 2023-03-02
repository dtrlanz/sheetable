class Pet {
    static Table = sheetable(Pet);

    @label('Species')
    species: string = '';

    @label('Name')
    name: string = '';

    @label('Age')
    age: number = 0;
}


function test00a() {
    const spreadsheet = SpreadsheetApp.openById('1EcUEaQyVXk6XkqAFva70QRwsrsbvImUu0hKR6jz9I00');
    const pets = new Pet.Table(spreadsheet, [new Pet()]);
}
