import React from "react";
type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export default function Textarea(props: Props) {
  return <textarea {...props} className={"input min-h-[100px] " + (props.className||"")} />;
}
