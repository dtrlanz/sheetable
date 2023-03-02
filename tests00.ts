class Pet {
    static Table = sheetable(Pet);

    @label('Species')
    species: string = '';

    @index @label('Name')
    name: string = '';

    @label('Age')
    age: number = 0;
}


function test00a() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const pets = new Pet.Table(spreadsheet, [new Pet()]);
}
