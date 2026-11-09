import { Button } from "@heroui/react"
import Icon from "./OpportunityIcon"

interface OpportunityInvestmentButtonProps {
    disabled: boolean,
    investmentHandler: () => void
}

const OpportunityInvestmentButton = ({disabled, investmentHandler} : OpportunityInvestmentButtonProps) => {
    return (
        <div className="flex flex-col items-center gap-3">
            <Button
                isDisabled={disabled}
                className="min-h-12 w-full rounded-md bg-warning text-base"
                onClick={investmentHandler}
            >
                Quiero invertir
            </Button>
            <p className="flex items-start gap-3 rounded-xl border border-border bg-slate-100/70 px-[14px] py-[12px] text-xs text-muted">
                <Icon name="info" className="mt-0.5 shrink-0 text-foreground" size={18}/>
                Puede invertir en esta iniciativa siempre que no se haya alcanzado el capital objetivo y no haya finalizado el plazo de financiación.
            </p>
        </div>
    )
}

export default OpportunityInvestmentButton;