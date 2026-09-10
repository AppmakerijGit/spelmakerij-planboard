namespace planboard.Services;

public class PlanningConflictException : Exception
{
    public PlanningConflictException() : base("De planning is gewijzigd door een andere beheerder. Herlaad de pagina om verder te gaan.") { }
}
