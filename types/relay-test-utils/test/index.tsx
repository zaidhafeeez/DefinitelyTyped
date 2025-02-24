import { ConcreteRequest, FragmentRefs, graphql } from "relay-runtime";
import { readFragment } from "relay-runtime/lib/store/ResolverFragments";
import { createMockEnvironment, MockPayloadGenerator, testResolver } from "relay-test-utils";

import React from "react";
import { loadQuery, PreloadedQuery, RelayEnvironmentProvider, useFragment, usePreloadedQuery } from "react-relay";

interface UserComponent_user {
    readonly id: string;
    readonly name: string;
    readonly profile_picture: {
        readonly uri: string;
    };
    readonly " $fragmentType": "UserComponent_user";
}

type UserComponent_user$data = UserComponent_user;

interface UserComponent_user$key {
    readonly " $data"?: UserComponent_user$data | undefined;
    readonly " $fragmentSpreads": FragmentRefs<"UserComponent_user">;
}

const userQuery = graphql`
    query UserQuery {
        user {
            ...UserComponent_user
        }
    }
`;

const Modal = ({ queryRef }: { queryRef: PreloadedQuery<any> }) => {
    const data = usePreloadedQuery(userQuery, queryRef);

    return <UserComponent userKey={data} />;
};

const UserComponent = ({ userKey }: { userKey: UserComponent_user$key }) => {
    const data = useFragment(
        graphql`
            fragment UserComponent_user on User {
                id
                name
                profile_picture {
                    uri
                }
            }
        `,
        userKey,
    );

    return (
        <>
            <h1>{data.name}</h1>
            <img src={data.profile_picture.uri} />
        </>
    );
};

function MockPayloadGeneratorTests() {
    // $ExpectType RelayMockEnvironment
    const environment = createMockEnvironment();

    // to get an operation type
    const operation = environment.mock.findOperation(() => true);

    MockPayloadGenerator.generate(operation);

    MockPayloadGenerator.generate(operation, {
        Query() {
            return {};
        },
    });

    MockPayloadGenerator.generate(operation, {
        User(context, generateId) {
            // $ExpectType number
            const id = generateId();

            return {
                id: (context.name || "") + String(id),
            };
        },
    });

    MockPayloadGenerator.generate(
        operation,
        {
            Query() {
                return {};
            },
        },
        {
            mockClientData: true,
        },
    );
}

function environmentTests() {
    // $ExpectType RelayMockEnvironment
    const environment = createMockEnvironment();

    const queryRef = loadQuery(environment, userQuery, {});

    environment.mock.queueOperationResolver(operation => {
        return MockPayloadGenerator.generate(operation);
    });

    // tests that the mock environment can be given to react-relay
    <RelayEnvironmentProvider environment={environment}>
        <Modal queryRef={queryRef} />
    </RelayEnvironmentProvider>;

    const operation = environment.mock.findOperation(operation =>
        operation.root.node === (userQuery as ConcreteRequest).operation
    );

    environment.mock.complete(operation);

    environment.mock.nextValue(operation, { data: {} });
    environment.mock.resolve(operation, { data: {} });
    environment.mock.queuePendingOperation(userQuery, {});

    // $ExpectType OperationDescriptor
    const newOperation = environment.mock.getMostRecentOperation();

    // $ExpectType readonly GraphQLSingularResponse[]
    const mockDataWithDeferredPayload1 = MockPayloadGenerator.generateWithDefer(newOperation, null, {
        generateDeferredPayload: true,
        mockClientData: true,
    });

    // $ExpectType readonly GraphQLSingularResponse[]
    const mockDataWithDeferredPayload2 = MockPayloadGenerator.generateWithDefer(newOperation, null, {
        generateDeferredPayload: true,
    });

    // $ExpectType GraphQLSingularResponse
    const mockDataWithoutDeferredPayload1 = MockPayloadGenerator.generateWithDefer(newOperation, null, {
        generateDeferredPayload: false,
        mockClientData: true,
    });

    // $ExpectType GraphQLSingularResponse
    const mockDataWithoutDeferredPayload2 = MockPayloadGenerator.generateWithDefer(newOperation, null, {
        mockClientData: true,
    });

    // $ExpectType GraphQLSingularResponse
    const mockDataWithoutDeferredPayload3 = MockPayloadGenerator.generateWithDefer(newOperation, null);

    environment.mock.resolve(
        operation,
        mockDataWithoutDeferredPayload1,
    );

    environment.mock.resolve(
        operation,
        mockDataWithoutDeferredPayload2,
    );

    environment.mock.resolve(
        operation,
        mockDataWithoutDeferredPayload3,
    );

    environment.mock.resolve(
        operation,
        mockDataWithDeferredPayload1,
    );

    environment.mock.resolve(
        operation,
        mockDataWithDeferredPayload2,
    );
}

function testResolverTests() {
    function myTestResolver(rootKey: UserComponent_user$key): string {
        const user = readFragment(
            graphql`
                fragment UserComponent_user on User {
                    id
                    name
                    profile_picture {
                        uri
                    }
                }
            `,
            rootKey,
        );

        return `Hello ${user.name ?? "stranger"}!`;
    }

    // $ExpectType string
    const result = testResolver(myTestResolver, {
        name: "Elizabeth",
        id: "123",
        profile_picture: {
            uri: "/profile.png",
        },
    });

    testResolver(myTestResolver, {
        name: "Elizabeth",
        // @ts-expect-error foo is not in the object
        foo: "bar",
    });

    testResolver(myTestResolver, {
        // @ts-expect-error name should be a string
        name: {},
    });
}
