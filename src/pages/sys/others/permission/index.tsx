import { Link } from "react-router";
import { DB_USER } from "@/fixtures/assets_backup";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthCheck } from "@/components/auth/use-auth";
import { CodeBlock } from "@/components/code/code-bock";
import { useSignIn, useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text } from "@/ui/typography";

const Component_Auth_1 = `
<AuthGuard
  check="permission:delete"
  baseOn="permission"
  fallback={
    <Text variant="body1" color="error">
      Missing <Text variant="code">permission:delete</Text>
    </Text>
  }
>
  <Button variant="destructive">
    Delete
  </Button>
</AuthGuard>
`;

const Component_Auth_2 = `
<AuthGuard
  checkAny={["permission:update", "permission:delete"]}
  baseOn="permission"
  fallback={
    <Text variant="body1" color="error">
      Missing <Text variant="code">permission:update</Text> or <Text variant="code">permission:delete</Text>
    </Text>
  }
>
  <Button variant="secondary">Detail</Button>
</AuthGuard>
`;

const Component_Auth_3 = `
<AuthGuard
  checkAll={["permission:read", "permission:create"]}
  baseOn="permission"
  fallback={
    <Text variant="body1" color="error">
      Missing <Text variant="code">permission:read</Text> and <Text variant="code">permission:create</Text>
    </Text>
  }
>
  <Button variant="destructive">Add</Button>
</AuthGuard>
`;

const Function_Auth_1 = `
const { check, checkAny, checkAll } = useAuthCheck();
check("permission:delete") ? (
  <Button variant="destructive">Delete</Button>
) : (
  <Text variant="body1" color="error">
    Missing <Text variant="code">permission:delete</Text>
  </Text>
);
`;

const Function_Auth_2 = `
const { check, checkAny, checkAll } = useAuthCheck();
checkAny(["permission:update", "permission:delete"]) ? (
  <Button variant="secondary">Detail</Button>
) : (
  <Text variant="body1" color="error">
`;

const Function_Auth_3 = `
const { check, checkAny, checkAll } = useAuthCheck();
checkAll(["permission:read", "permission:create"]) ? (
  <Button variant="secondary">Add</Button>
) : (
  <Text variant="body1" color="error">
`;

export default function PermissionPage() {
	const { permissions, roles, username } = useUserInfo();
	const signIn = useSignIn();
	const { check, checkAny, checkAll } = useAuthCheck();

	const handleSwitch = (_username: string) => {
		if (_username === username) return;
		const user = DB_USER.find((user) => user.username === _username);
		if (user) {
			signIn({ username: user.username, password: user.password });
		}
	};
	return (
		<div className="flex flex-col gap-4">
			<div className="w-full flex  items-center justify-center">
				<Text variant="subTitle1">Signed in as:</Text>
				<Tabs defaultValue={username} onValueChange={handleSwitch}>
					<TabsList>
						{DB_USER.map((user) => (
							<TabsTrigger key={user.username} value={user.username}>
								{user.username}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>
			<Card>
				<CardContent>
					<div className="flex items-center gap-2">
						<Text variant="body1">Roles:</Text>
						{permissions && permissions.length > 0 ? (
							<Text variant="body1">[{roles?.map((role) => role.name).join(", ")}]</Text>
						) : (
							<Text variant="body1">[]</Text>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Text variant="body1">Permissions:</Text>
						{permissions && permissions.length > 0 ? (
							<Text variant="body1">[{permissions?.map((permission) => permission.code).join(", ")}]</Text>
						) : (
							<Text variant="body1">[]</Text>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Route guard demo</CardTitle>
					<CardDescription>
						Use the button below; with the required permission you reach the page, otherwise you see 403.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link to="/permission/page-test">
						<Button>Open protected page</Button>
					</Link>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Component guard demo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2 flex-col">
						<CodeBlock
							code={Component_Auth_1.trim()}
							options={{
								lang: "tsx",
							}}
							title="Single permission"
							description="Shows Delete when the user has permission:delete; otherwise shows fallback."
						>
							<AuthGuard
								check="permission:delete"
								baseOn="permission"
								fallback={
									<Text variant="body1" color="error">
										Missing <Text variant="code">permission:delete</Text>
									</Text>
								}
							>
								<Button variant="destructive">Delete</Button>
							</AuthGuard>
						</CodeBlock>

						<CodeBlock
							code={Component_Auth_2.trim()}
							title="Any of multiple permissions"
							description="Shows Detail when the user has permission:update or permission:delete."
							options={{
								lang: "tsx",
							}}
						>
							<AuthGuard
								checkAny={["permission:update", "permission:delete"]}
								baseOn="permission"
								fallback={
									<Text variant="body1" color="error">
										Missing <Text variant="code">permission:update</Text> or{" "}
										<Text variant="code">permission:delete</Text>
									</Text>
								}
							>
								<Button variant="secondary">Detail</Button>
							</AuthGuard>
						</CodeBlock>

						<CodeBlock
							code={Component_Auth_3.trim()}
							options={{
								lang: "tsx",
							}}
							title="All of multiple permissions"
							description="Shows Add when the user has both permission:read and permission:create."
						>
							<AuthGuard
								checkAll={["permission:read", "permission:create"]}
								baseOn="permission"
								fallback={
									<Text variant="body1" color="error">
										Missing <Text variant="code">permission:read</Text> and{" "}
										<Text variant="code">permission:create</Text>
									</Text>
								}
							>
								<Button variant="secondary">Add</Button>
							</AuthGuard>
						</CodeBlock>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Imperative guard demo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2 flex-col">
						<CodeBlock
							code={Function_Auth_1.trim()}
							options={{
								lang: "tsx",
							}}
							title="Single permission"
							description="Same as above using useAuthCheck()."
						>
							{check("permission:delete") ? (
								<Button variant="destructive">Delete</Button>
							) : (
								<Text variant="body1" color="error">
									Missing <Text variant="code">permission:delete</Text>
								</Text>
							)}
						</CodeBlock>

						<CodeBlock
							code={Function_Auth_2.trim()}
							title="Any of multiple permissions"
							description="Same pattern with checkAny."
							options={{
								lang: "tsx",
							}}
						>
							{checkAny(["permission:update", "permission:delete"]) ? (
								<Button variant="secondary">Detail</Button>
							) : (
								<Text variant="body1" color="error">
									Missing <Text variant="code">permission:update</Text> or <Text variant="code">permission:delete</Text>
								</Text>
							)}
						</CodeBlock>

						<CodeBlock
							code={Function_Auth_3.trim()}
							options={{
								lang: "tsx",
							}}
							title="All of multiple permissions"
							description="Same pattern with checkAll."
						>
							{checkAll(["permission:read", "permission:create"]) ? (
								<Button variant="secondary">Add</Button>
							) : (
								<Text variant="body1" color="error">
									Missing <Text variant="code">permission:read</Text> and <Text variant="code">permission:create</Text>
								</Text>
							)}
						</CodeBlock>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
