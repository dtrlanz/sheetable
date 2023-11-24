class Pet {
    static Table = Sheetable.table(Pet);

    @Sheetable.label('Species')
    species: string = '';

    @Sheetable.index @Sheetable.label('Name')
    name: string = '';

    @Sheetable.label('Age')
    age: number = 0;
}
